<?xml version="1.0" encoding="UTF-8"?>
<!--
Transform eDok/flashterm FileMaker XML export to TBX v3 using the TBX-flashterm DCA profile.

Based on the former SDL MultiTerm MTF export stylesheet by:
Peter Prohaska <peter.prohaska@gmail.com> (c) 2011, 2013
Joachim Eisenrieth <joachim.@eisenrieth.de> (c) 2025

TBX v3 restructuring: 2026
TBX-flashterm profile v02 with language-level HTML infoboxes and concept-level figures: 2026

Input:  FileMaker FMPXMLRESULT
Output: TBX v3 / TBX-flashterm XML, XSLT 1.0 compatible
-->
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:fmp="http://www.filemaker.com/fmpxmlresult"
    xmlns="urn:iso:std:iso:30042:ed:3.0"
    exclude-result-prefixes="fmp">

    <xsl:strip-space elements="*" />
    <xsl:output method="xml" encoding="UTF-8" standalone="no"
        indent="yes" omit-xml-declaration="no" />

    <!-- ============================================================
         Configuration
         ============================================================ -->
    <xsl:variable name="opt_date_only_stamp" select="true()" />
    <xsl:variable name="opt_add_vim_modeline" select="false()" />

    <!-- ============================================================
         Grouping keys
         ============================================================ -->
    <xsl:key name="concept.rows" match="fmp:ROW" use="fmp:COL[5]/fmp:DATA" />
    <xsl:key name="conceptlang.rows" match="fmp:ROW"
        use="concat(fmp:COL[5]/fmp:DATA, '|', fmp:COL[24]/fmp:DATA)" />

    <!-- ============================================================
         FileMaker column index variables
         ============================================================ -->
    <xsl:variable name="administrativeStatus.idx" select="number(1)" />
    <xsl:variable name="administrativeStatusID.idx" select="number(2)" />
    <xsl:variable name="category.idx" select="number(3)" />
    <xsl:variable name="categoryIDs.idx" select="number(4)" />
    <xsl:variable name="conceptID.idx" select="number(5)" />
    <xsl:variable name="context.idx" select="number(6)" />
    <xsl:variable name="contextFootnote.idx" select="number(7)" />
    <xsl:variable name="definition.idx" select="number(8)" />
    <xsl:variable name="explanation.idx" select="number(9)" />
    <xsl:variable name="flexionID.idx" select="number(10)" />
    <xsl:variable name="flexionTermID.idx" select="number(11)" />
    <xsl:variable name="footnote1.idx" select="number(12)" />
    <xsl:variable name="footnote2.idx" select="number(13)" />
    <xsl:variable name="footnoteDefinition.idx" select="number(14)" />
    <xsl:variable name="fullFormTermID.idx" select="number(15)" />
    <xsl:variable name="grammaticalGenderID.idx" select="number(16)" />
    <xsl:variable name="httpLink1.idx" select="number(17)" />
    <xsl:variable name="httpLink2.idx" select="number(18)" />
    <xsl:variable name="httpLink3.idx" select="number(19)" />
    <xsl:variable name="ID.idx" select="number(20)" />
    <xsl:variable name="info.idx" select="number(21)" />
    <xsl:variable name="infoFootnote.idx" select="number(22)" />
    <xsl:variable name="inputter.idx" select="number(23)" />
    <xsl:variable name="languageCode.idx" select="number(24)" />
    <xsl:variable name="lockReason.idx" select="number(25)" />
    <xsl:variable name="lockReasonID.idx" select="number(26)" />
    <xsl:variable name="modification.idx" select="number(27)" />
    <xsl:variable name="normativeAuthorizationID.idx" select="number(28)" />
    <xsl:variable name="origination.idx" select="number(29)" />
    <xsl:variable name="originator.idx" select="number(30)" />
    <xsl:variable name="partOfSpeechID.idx" select="number(31)" />
    <xsl:variable name="subjectArea.idx" select="number(32)" />
    <xsl:variable name="subjectAreaIDs.idx" select="number(33)" />
    <xsl:variable name="term.idx" select="number(34)" />
    <xsl:variable name="updater.idx" select="number(35)" />
    <xsl:variable name="weightingCommon.idx" select="number(36)" />
    <xsl:variable name="weightingSpecial.idx" select="number(37)" />
    <xsl:variable name="infoBox.idx" select="number(38)" />
    <xsl:variable name="figureFileName.idx" select="number(39)" />

    <xsl:variable name="gk1" select="'concept.rows'" />
    <xsl:variable name="gk2" select="'conceptlang.rows'" />
    <xsl:variable name="gi1" select="$conceptID.idx" />
    <xsl:variable name="gi2" select="$languageCode.idx" />

    <!-- ============================================================
         Root and FileMaker wrapper handling
         ============================================================ -->
    <xsl:template match="/">
        <tbx type="TBX-flashterm" style="dca">
            <tbxHeader>
                <fileDesc>
                    <titleStmt>
                        <title>flashterm TBX v3 Export (TBX-flashterm profile)</title>
                    </titleStmt>
                    <sourceDesc>
                        <p>Terminology export generated from flashterm.</p>
                    </sourceDesc>
                </fileDesc>
                <encodingDesc>
                    <p type="DCSName">TBX-flashterm</p>
                </encodingDesc>
            </tbxHeader>
            <text>
                <body>
                    <xsl:apply-templates />
                </body>
            </text>
        </tbx>

        <xsl:if test="$opt_add_vim_modeline">
            <xsl:call-template name="vim-modeline" />
        </xsl:if>
    </xsl:template>

    <xsl:template match="fmp:ERRORCODE | fmp:PRODUCT | fmp:DATABASE | fmp:METADATA" />

    <xsl:template match="fmp:RESULTSET">
        <xsl:apply-templates
            select="fmp:ROW[count(. | key($gk1, fmp:COL[$gi1]/fmp:DATA)[1]) = 1]"
            mode="regroup.1">
            <xsl:sort select="fmp:COL[$gi1]/fmp:DATA" order="ascending" data-type="number" />
        </xsl:apply-templates>
    </xsl:template>

    <!-- ============================================================
         Concept level: one termEntry per concept
         ============================================================ -->
    <xsl:template match="fmp:ROW" mode="regroup.1">
        <termEntry>
            <xsl:attribute name="id">
                <xsl:text>c</xsl:text>
                <xsl:value-of select="fmp:COL[$conceptID.idx]/fmp:DATA" />
            </xsl:attribute>

            <xsl:call-template name="mk-subjectarea" />
            <xsl:call-template name="mk-category" />
            <xsl:call-template name="mk-figure" />

            <xsl:apply-templates
                select="key($gk1, fmp:COL[$gi1]/fmp:DATA)
                    [count(. | key($gk2, concat(fmp:COL[$gi1]/fmp:DATA, '|', fmp:COL[$gi2]/fmp:DATA))[1]) = 1]"
                mode="regroup.2">
                <xsl:sort select="fmp:COL[$gi2]/fmp:DATA" />
            </xsl:apply-templates>
        </termEntry>
    </xsl:template>

    <!-- ============================================================
         Language level: one langSec per concept and language
         ============================================================ -->
    <xsl:template match="fmp:ROW" mode="regroup.2">
        <langSec>
            <xsl:attribute name="id">
                <xsl:text>c</xsl:text>
                <xsl:value-of select="fmp:COL[$conceptID.idx]/fmp:DATA" />
                <xsl:text>-</xsl:text>
                <xsl:value-of select="fmp:COL[$languageCode.idx]/fmp:DATA" />
            </xsl:attribute>

            <xsl:attribute name="xml:lang">
                <xsl:value-of select="fmp:COL[$languageCode.idx]/fmp:DATA" />
            </xsl:attribute>

            <xsl:call-template name="mk-definition" />
            <xsl:call-template name="mk-definitionFootnote" />
            <xsl:call-template name="mk-infoBox" />

            <xsl:apply-templates
                select="key($gk2, concat(fmp:COL[$gi1]/fmp:DATA, '|', fmp:COL[$gi2]/fmp:DATA))" />
        </langSec>
    </xsl:template>

    <!-- ============================================================
         Term level: one termSec per term row
         ============================================================ -->
    <xsl:template match="fmp:ROW">
        <termSec>
            <xsl:attribute name="id">
                <xsl:text>t</xsl:text>
                <xsl:value-of select="fmp:COL[$ID.idx]/fmp:DATA" />
            </xsl:attribute>

            <xsl:call-template name="mk-term" />
            <xsl:call-template name="mk-weightingCommon" />

            <xsl:call-template name="mk-partOfSpeech" />
            <xsl:call-template name="mk-grammaticalGender" />
            <xsl:call-template name="mk-termType" />

            <xsl:call-template name="mk-context" />
            <xsl:call-template name="mk-contextFootnote" />

            <xsl:call-template name="mk-footnote1" />
            <xsl:call-template name="mk-footnote2" />

            <xsl:call-template name="mk-info" />
            <xsl:call-template name="mk-infoFootnote" />

            <xsl:call-template name="mk-link-notes" />

            <xsl:call-template name="mk-origination" />
            <xsl:call-template name="mk-modification" />
        </termSec>
    </xsl:template>

    <!-- ============================================================
         Generic output helpers
         ============================================================ -->
    <xsl:template name="mk-descripGrp">
        <xsl:param name="type" />
        <xsl:param name="value" />
        <xsl:variable name="cleanValue" select="normalize-space($value)" />

        <xsl:if test="$type = ''">
            <xsl:message terminate="yes">
                <xsl:text>Fehler: Parameter 'type' wertlos. Transformation abgebrochen.</xsl:text>
            </xsl:message>
        </xsl:if>

        <xsl:if test="$cleanValue != ''">
            <descrip type="{$type}">
                <xsl:value-of select="$cleanValue" />
            </descrip>
        </xsl:if>
    </xsl:template>

    <xsl:template name="mk-note">
        <xsl:param name="value" />
        <xsl:variable name="cleanValue" select="normalize-space($value)" />

        <xsl:if test="$cleanValue != ''">
            <note>
                <xsl:value-of select="$cleanValue" />
            </note>
        </xsl:if>
    </xsl:template>

    <xsl:template name="mk-admin">
        <xsl:param name="type" />
        <xsl:param name="value" />
        <xsl:variable name="cleanValue" select="normalize-space($value)" />

        <xsl:if test="$type != '' and $cleanValue != ''">
            <admin type="{$type}">
                <xsl:value-of select="$cleanValue" />
            </admin>
        </xsl:if>
    </xsl:template>

    <xsl:template name="vim-modeline">
        <xsl:comment> vim:set ts=4 sw=4 sts=4 noet: </xsl:comment>
    </xsl:template>

    <!-- ============================================================
         Concept-level descriptive fields
         ============================================================ -->
    <xsl:template name="mk-subjectarea">
        <xsl:call-template name="mk-descripGrp">
            <xsl:with-param name="type" select="'subjectField'" />
            <xsl:with-param name="value" select="fmp:COL[$subjectArea.idx]/fmp:DATA" />
        </xsl:call-template>
    </xsl:template>

    <xsl:template name="mk-category">
        <xsl:call-template name="mk-descripGrp">
            <xsl:with-param name="type" select="'x-category'" />
            <xsl:with-param name="value" select="fmp:COL[$category.idx]/fmp:DATA" />
        </xsl:call-template>
    </xsl:template>

    <!-- ============================================================
         Language-level descriptive fields
         ============================================================ -->
    <xsl:template name="mk-definition">
        <xsl:call-template name="mk-descripGrp">
            <xsl:with-param name="type" select="'definition'" />
            <xsl:with-param name="value" select="fmp:COL[$definition.idx]/fmp:DATA" />
        </xsl:call-template>
    </xsl:template>

    <xsl:template name="mk-definitionFootnote">
        <xsl:variable name="value" select="normalize-space(fmp:COL[$footnoteDefinition.idx]/fmp:DATA)" />
        <xsl:if test="$value != ''">
            <note>
                <xsl:text>Definition: </xsl:text>
                <xsl:value-of select="$value" />
            </note>
        </xsl:if>
    </xsl:template>

    <xsl:template name="mk-infoBox">
        <!--
            The value is stored as HTML text. xsl:value-of deliberately
            escapes the markup so that the result remains valid TBX XML.
            Do not normalize the value: line breaks are part of the article.
        -->
        <xsl:variable name="value" select="fmp:COL[$infoBox.idx]/fmp:DATA" />
        <xsl:if test="string-length(normalize-space($value)) &gt; 0">
            <descripGrp>
                <descrip type="flashtermInfobox">
                    <xsl:value-of select="$value" />
                </descrip>
                <descripNote type="contentFormat">text/html</descripNote>
            </descripGrp>
        </xsl:if>
    </xsl:template>

    <xsl:template name="mk-figure">
        <!--
            xGraphic is the TBX-Basic data category for an external image.
            The template is called once for the representative row of each
            concept. Only the file name is exported; stage resolves it
            against the asset base path of the publication.
        -->
        <xsl:variable name="value" select="normalize-space(fmp:COL[$figureFileName.idx]/fmp:DATA)" />
        <xsl:if test="$value != ''">
            <xref type="xGraphic" target="{$value}" />
        </xsl:if>
    </xsl:template>

    <!-- ============================================================
         Term-level fields
         ============================================================ -->
    <xsl:template name="mk-term">
        <xsl:variable name="term" select="normalize-space(fmp:COL[$term.idx]/fmp:DATA)" />

        <xsl:if test="$term != ''">
            <term>
                <xsl:value-of select="$term" />
            </term>
        </xsl:if>
    </xsl:template>

    <xsl:template name="mk-weightingCommon">
        <xsl:variable name="key" select="number(fmp:COL[$weightingCommon.idx]/fmp:DATA)" />

        <xsl:variable name="administrativeStatus">
            <xsl:choose>
                <xsl:when test="$key = 2">preferredTerm</xsl:when>
                <xsl:when test="$key = 1">admittedTerm</xsl:when>
                <xsl:when test="$key = 0">deprecatedTerm</xsl:when>
            </xsl:choose>
        </xsl:variable>

        <xsl:if test="$administrativeStatus != ''">
            <termNote type="administrativeStatus">
                <xsl:value-of select="$administrativeStatus" />
            </termNote>
        </xsl:if>
    </xsl:template>

    <xsl:template name="mk-partOfSpeech">
        <xsl:variable name="key" select="number(fmp:COL[$partOfSpeechID.idx]/fmp:DATA)" />

        <xsl:variable name="partOfSpeech">
            <xsl:choose>
                <xsl:when test="$key = 1">noun</xsl:when>
                <xsl:when test="$key = 2">verb</xsl:when>
                <xsl:when test="$key = 3">adjective</xsl:when>
                <xsl:when test="$key = 9">adverb</xsl:when>
            </xsl:choose>
        </xsl:variable>

        <xsl:if test="$partOfSpeech != ''">
            <termNote type="partOfSpeech">
                <xsl:value-of select="$partOfSpeech" />
            </termNote>
        </xsl:if>
    </xsl:template>

    <xsl:template name="mk-grammaticalGender">
        <xsl:variable name="key" select="number(fmp:COL[$grammaticalGenderID.idx]/fmp:DATA)" />

        <xsl:variable name="gender">
            <xsl:choose>
                <xsl:when test="$key = 1">feminine</xsl:when>
                <xsl:when test="$key = 2">masculine</xsl:when>
                <xsl:when test="$key = 3">neuter</xsl:when>
            </xsl:choose>
        </xsl:variable>

        <xsl:if test="$gender != ''">
            <termNote type="grammaticalGender">
                <xsl:value-of select="$gender" />
            </termNote>
        </xsl:if>
    </xsl:template>

    <xsl:template name="mk-termType">
        <xsl:variable name="posidRaw" select="normalize-space(fmp:COL[$partOfSpeechID.idx]/fmp:DATA)" />
        <xsl:variable name="fullFormRaw" select="normalize-space(fmp:COL[$fullFormTermID.idx]/fmp:DATA)" />
        <xsl:variable name="posid" select="number($posidRaw)" />

        <xsl:variable name="termType">
            <xsl:choose>
                <xsl:when test="$posidRaw != '' and $posid = 4">abbreviation</xsl:when>
                <xsl:when test="$fullFormRaw != '' and $fullFormRaw != '0'">fullForm</xsl:when>
            </xsl:choose>
        </xsl:variable>

        <xsl:if test="$termType != ''">
            <termNote type="termType">
                <xsl:value-of select="$termType" />
            </termNote>
        </xsl:if>
    </xsl:template>

    <xsl:template name="mk-context">
        <xsl:call-template name="mk-descripGrp">
            <xsl:with-param name="type" select="'context'" />
            <xsl:with-param name="value" select="fmp:COL[$context.idx]/fmp:DATA" />
        </xsl:call-template>
    </xsl:template>

    <xsl:template name="mk-contextFootnote">
        <xsl:variable name="value" select="normalize-space(fmp:COL[$contextFootnote.idx]/fmp:DATA)" />
        <xsl:if test="$value != ''">
            <note>
                <xsl:text>Kontext: </xsl:text>
                <xsl:value-of select="$value" />
            </note>
        </xsl:if>
    </xsl:template>

    <xsl:template name="mk-footnote1">
        <xsl:variable name="value" select="normalize-space(fmp:COL[$footnote1.idx]/fmp:DATA)" />
        <xsl:if test="$value != ''">
            <note>
                <xsl:text>Fußnote 1: </xsl:text>
                <xsl:value-of select="$value" />
            </note>
        </xsl:if>
    </xsl:template>

    <xsl:template name="mk-footnote2">
        <xsl:variable name="value" select="normalize-space(fmp:COL[$footnote2.idx]/fmp:DATA)" />
        <xsl:if test="$value != ''">
            <note>
                <xsl:text>Fußnote 2: </xsl:text>
                <xsl:value-of select="$value" />
            </note>
        </xsl:if>
    </xsl:template>

    <xsl:template name="mk-info">
        <xsl:call-template name="mk-note">
            <xsl:with-param name="value" select="fmp:COL[$info.idx]/fmp:DATA" />
        </xsl:call-template>
    </xsl:template>

    <xsl:template name="mk-infoFootnote">
        <xsl:variable name="value" select="normalize-space(fmp:COL[$infoFootnote.idx]/fmp:DATA)" />
        <xsl:if test="$value != ''">
            <note>
                <xsl:text>Info: </xsl:text>
                <xsl:value-of select="$value" />
            </note>
        </xsl:if>
    </xsl:template>

    <xsl:template name="mk-link-notes">
        <xsl:variable name="ref1" select="normalize-space(fmp:COL[$httpLink1.idx]/fmp:DATA)" />
        <xsl:variable name="ref2" select="normalize-space(fmp:COL[$httpLink2.idx]/fmp:DATA)" />
        <xsl:variable name="ref3" select="normalize-space(fmp:COL[$httpLink3.idx]/fmp:DATA)" />

        <xsl:if test="$ref1 != ''">
            <xref type="externalReference" target="{$ref1}" />
        </xsl:if>
        <xsl:if test="$ref2 != ''">
            <xref type="externalReference" target="{$ref2}" />
        </xsl:if>
        <xsl:if test="$ref3 != ''">
            <xref type="externalReference" target="{$ref3}" />
        </xsl:if>
    </xsl:template>

    <!-- ============================================================
         Administrative fields for TBX v3
         ============================================================ -->
    <xsl:template name="mk-origination">
        <xsl:variable name="actor" select="normalize-space(fmp:COL[$originator.idx]/fmp:DATA)" />
        <xsl:variable name="date">
            <xsl:call-template name="mkdate">
                <xsl:with-param name="stamp" select="fmp:COL[$origination.idx]/fmp:DATA" />
            </xsl:call-template>
        </xsl:variable>

        <xsl:call-template name="mk-admin">
            <xsl:with-param name="type" select="'createdBy'" />
            <xsl:with-param name="value" select="$actor" />
        </xsl:call-template>
        <xsl:call-template name="mk-admin">
            <xsl:with-param name="type" select="'creationDate'" />
            <xsl:with-param name="value" select="$date" />
        </xsl:call-template>
    </xsl:template>

    <xsl:template name="mk-modification">
        <xsl:variable name="actor" select="normalize-space(fmp:COL[$updater.idx]/fmp:DATA)" />
        <xsl:variable name="date">
            <xsl:call-template name="mkdate">
                <xsl:with-param name="stamp" select="fmp:COL[$modification.idx]/fmp:DATA" />
            </xsl:call-template>
        </xsl:variable>

        <xsl:call-template name="mk-admin">
            <xsl:with-param name="type" select="'changedBy'" />
            <xsl:with-param name="value" select="$actor" />
        </xsl:call-template>
        <xsl:call-template name="mk-admin">
            <xsl:with-param name="type" select="'changeDate'" />
            <xsl:with-param name="value" select="$date" />
        </xsl:call-template>
    </xsl:template>

    <!-- ============================================================
         Date and timestamp normalization
         ============================================================ -->
    <xsl:template name="mkdate">
        <xsl:param name="stamp" />

        <xsl:choose>
            <xsl:when test="normalize-space($stamp) = ''" />
            <xsl:when test="contains($stamp, 'T')">
                <xsl:call-template name="normalize-stamp">
                    <xsl:with-param name="sep" select="'T'" />
                    <xsl:with-param name="stamp" select="$stamp" />
                </xsl:call-template>
            </xsl:when>
            <xsl:when test="contains(normalize-space($stamp), ' ')">
                <xsl:call-template name="normalize-stamp">
                    <xsl:with-param name="sep" select="' '" />
                    <xsl:with-param name="stamp" select="$stamp" />
                </xsl:call-template>
            </xsl:when>
            <xsl:otherwise>
                <xsl:call-template name="normalize-stamp">
                    <xsl:with-param name="sep" select="$stampsep" />
                    <xsl:with-param name="stamp" select="$stamp" />
                </xsl:call-template>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <xsl:template name="mk-date">
        <xsl:param name="year" select="number(1900)" />
        <xsl:param name="month" select="number(1)" />
        <xsl:param name="day" select="number(1)" />
        <xsl:param name="sep" select="'-'" />
        <xsl:value-of select="format-number($year, '0000')" />
        <xsl:value-of select="$sep" />
        <xsl:value-of select="format-number($month, '00')" />
        <xsl:value-of select="$sep" />
        <xsl:value-of select="format-number($day, '00')" />
    </xsl:template>

    <xsl:template name="mk-time">
        <xsl:param name="hour" select="number(0)" />
        <xsl:param name="min" select="number(0)" />
        <xsl:param name="sec" select="number(0)" />
        <xsl:param name="sep" select="':'" />
        <xsl:value-of select="format-number($hour, '00')" />
        <xsl:value-of select="$sep" />
        <xsl:value-of select="format-number($min, '00')" />
        <xsl:value-of select="$sep" />
        <xsl:value-of select="format-number($sec, '00')" />
    </xsl:template>

    <xsl:template name="mk-stamp">
        <xsl:param name="date" />
        <xsl:param name="time" />
        <xsl:param name="sep" select="'T'" />

        <xsl:choose>
            <xsl:when test="$opt_date_only_stamp">
                <xsl:value-of select="$date" />
            </xsl:when>
            <xsl:otherwise>
                <xsl:value-of select="concat($date, $sep, $time)" />
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <xsl:variable name="datefmt"
        select="normalize-space(translate(//fmp:DATABASE/@DATEFORMAT, 'ymd', 'YMD'))" />

    <xsl:template name="mk-datesep">
        <xsl:param name="date" />
        <xsl:choose>
            <xsl:when test="contains($date, '-')">-</xsl:when>
            <xsl:when test="contains($date, '.')">.</xsl:when>
            <xsl:when test="contains($date, '/')">/</xsl:when>
        </xsl:choose>
    </xsl:template>

    <xsl:variable name="timefmt"
        select="normalize-space(translate(//fmp:DATABASE/@TIMEFORMAT, 'KMS', 'kms'))" />

    <xsl:variable name="timesep">
        <xsl:choose>
            <xsl:when test="contains($timefmt, ':')">:</xsl:when>
        </xsl:choose>
    </xsl:variable>

    <xsl:variable name="stampsep" select="' '" />

    <xsl:template name="normalize-date">
        <xsl:param name="date" select="." />

        <xsl:variable name="isep">
            <xsl:call-template name="mk-datesep">
                <xsl:with-param name="date" select="$date" />
            </xsl:call-template>
        </xsl:variable>

        <xsl:choose>
            <xsl:when test="normalize-space($date) = ''" />
            <xsl:when test="$isep = ''">
                <xsl:value-of select="$date" />
            </xsl:when>
            <xsl:otherwise>
                <xsl:variable name="order">
                    <xsl:choose>
                        <xsl:when test="$isep = '.'">DMY</xsl:when>
                        <xsl:when test="$isep = '/'">MDY</xsl:when>
                        <xsl:when test="$isep = '-'">YMD</xsl:when>
                    </xsl:choose>
                </xsl:variable>

                <xsl:variable name="rest" select="normalize-space($date)" />
                <xsl:variable name="a" select="substring-before($rest, $isep)" />
                <xsl:variable name="rest2" select="substring-after($rest, $isep)" />
                <xsl:variable name="b" select="substring-before($rest2, $isep)" />
                <xsl:variable name="c" select="substring-after($rest2, $isep)" />

                <xsl:choose>
                    <xsl:when test="string(number($a)) = 'NaN' or string(number($b)) = 'NaN' or string(number($c)) = 'NaN'">
                        <xsl:value-of select="$date" />
                    </xsl:when>
                    <xsl:when test="$order = 'YMD'">
                        <xsl:call-template name="mk-date">
                            <xsl:with-param name="year" select="number($a)" />
                            <xsl:with-param name="month" select="number($b)" />
                            <xsl:with-param name="day" select="number($c)" />
                        </xsl:call-template>
                    </xsl:when>
                    <xsl:when test="$order = 'MDY'">
                        <xsl:call-template name="mk-date">
                            <xsl:with-param name="year" select="number($c)" />
                            <xsl:with-param name="month" select="number($a)" />
                            <xsl:with-param name="day" select="number($b)" />
                        </xsl:call-template>
                    </xsl:when>
                    <xsl:when test="$order = 'DMY'">
                        <xsl:call-template name="mk-date">
                            <xsl:with-param name="year" select="number($c)" />
                            <xsl:with-param name="month" select="number($b)" />
                            <xsl:with-param name="day" select="number($a)" />
                        </xsl:call-template>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:value-of select="$date" />
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <xsl:template name="normalize-time">
        <xsl:param name="sep" select="$timesep" />
        <xsl:param name="time" select="." />

        <xsl:variable name="isep">
            <xsl:choose>
                <xsl:when test="$sep != ''"><xsl:value-of select="$sep" /></xsl:when>
                <xsl:otherwise>:</xsl:otherwise>
            </xsl:choose>
        </xsl:variable>

        <xsl:variable name="rest" select="normalize-space($time)" />
        <xsl:variable name="a" select="substring-before($rest, $isep)" />
        <xsl:variable name="rest2" select="substring-after($rest, $isep)" />
        <xsl:variable name="b" select="substring-before($rest2, $isep)" />
        <xsl:variable name="c" select="substring-after($rest2, $isep)" />

        <xsl:variable name="a2">
            <xsl:choose>
                <xsl:when test="$a != ''"><xsl:value-of select="$a" /></xsl:when>
                <xsl:otherwise>0</xsl:otherwise>
            </xsl:choose>
        </xsl:variable>

        <xsl:variable name="b2">
            <xsl:choose>
                <xsl:when test="$b != ''"><xsl:value-of select="$b" /></xsl:when>
                <xsl:when test="$rest2 != '' and not(starts-with($rest2, $isep))">
                    <xsl:value-of select="$rest2" />
                </xsl:when>
                <xsl:otherwise>0</xsl:otherwise>
            </xsl:choose>
        </xsl:variable>

        <xsl:variable name="c2">
            <xsl:choose>
                <xsl:when test="$c != ''"><xsl:value-of select="$c" /></xsl:when>
                <xsl:otherwise>0</xsl:otherwise>
            </xsl:choose>
        </xsl:variable>

        <xsl:call-template name="mk-time">
            <xsl:with-param name="hour" select="number($a2)" />
            <xsl:with-param name="min" select="number($b2)" />
            <xsl:with-param name="sec" select="number($c2)" />
        </xsl:call-template>
    </xsl:template>

    <xsl:template name="normalize-stamp">
        <xsl:param name="sep" select="$stampsep" />
        <xsl:param name="stamp" select="." />

        <xsl:if test="normalize-space($stamp) != ''">
            <xsl:variable name="isep" select="$sep" />
            <xsl:variable name="rest" select="normalize-space($stamp)" />
            <xsl:variable name="a" select="substring-before($rest, $isep)" />
            <xsl:variable name="b" select="substring-after($rest, $isep)" />

            <xsl:variable name="datePart">
                <xsl:choose>
                    <xsl:when test="$a = '' and $b = '' and not(contains($rest, $isep))">
                        <xsl:value-of select="$rest" />
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:value-of select="$a" />
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:variable>

            <xsl:variable name="timePart" select="$b" />

            <xsl:variable name="date">
                <xsl:call-template name="normalize-date">
                    <xsl:with-param name="date" select="$datePart" />
                </xsl:call-template>
            </xsl:variable>

            <xsl:variable name="time">
                <xsl:call-template name="normalize-time">
                    <xsl:with-param name="time" select="$timePart" />
                </xsl:call-template>
            </xsl:variable>

            <xsl:call-template name="mk-stamp">
                <xsl:with-param name="date" select="$date" />
                <xsl:with-param name="time" select="$time" />
                <xsl:with-param name="sep" select="'T'" />
            </xsl:call-template>
        </xsl:if>
    </xsl:template>

</xsl:stylesheet>
